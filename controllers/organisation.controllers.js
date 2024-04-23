import prisma from '../config/db.config.js';
import { response_201, response_400, response_500,response_200, response_404 } from '../utils/statuscodes.utils.js';
import { userRole } from '@prisma/client';
import { randomInt } from 'crypto';

export async function createOrganisation ( req, res) {
    try {
      const { name } = req.body;
      const createdById = req.user.id;

      const organization = await prisma.organization.create({
        data: {
          Name: name,
          CreatedById: createdById,
        },
      });

      const member = await prisma.member.create({
          data: {
              UserId: createdById,
              OrganizationId: organization.id,
              UserRole: userRole.ASSIGNER,
          }
      })

      response_201(res, "Organisation Created", organization);
    } catch (error) {
      response_500(res, 'Error creating organization:', error);
    }
  }


export async function getOrganisation ( req, res) {
    try {
      const organisation = await prisma.organization.findUnique({
        where: {
          id: req.params.id,
        },
        include: {
          Tasks: {
            include: {
              Assignee: true,
              Assigner: true,
            },
          },
          Member: true
        }
      });
      if(!organisation){
        return response_400(res, "Organisation not found");
      }
      response_201(res, "Organisation Found", organisation);
    } catch (error) {
      response_500(res, 'Error getting organization:', error);
    }
  }

export async function addMemberToOrganization (req, res) {
    try {
      // Extract organization ID, user ID, and user role from request
      const { organisationId, userId, userRole } = req.body;

      console.log(organisationId, userId, userRole);

      // Check if organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organisationId },
        include: {
          Member: true,
          Tasks: true
        },
      });
      console.log(organization);
      if (!organization) {
          return response_404(res, 'Organization not found');
      }
      if(organization.createdById === req.user.id){
        return response_400(res, "You cannot add yourself to the organization");
      }

      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
       return response_404(res, 'User not found');
      }

      // Check if user is already a member of the organization
      const existingMember = await prisma.member.findFirst({
        where: {
          OrganizationId: organisationId,
          UserId: userId,
        },
      });
      console.log(existingMember);

      if (existingMember) {
        response_400(res, 'User is already a member of the organization');
      }

      // Add member to the organization
      const member = await prisma.member.create({
        data: {
          UserId: userId,
          OrganizationId: organisationId,
          UserRole: userRole,
        },
      });

      console.log(member);

      return response_200(res, 'Member added to organization', {
          AddedMember: member,
            Organization: organization,
      });

    } catch (error) {
      response_500(res, 'Error adding member to organization:', error);
    }
  }

export async function deleteMemberFromOrg (req, res){
    try {
        const memberExist = await prisma.member.findUnique({
          where: {
              id: req.params.id
          }
        });

        if (!memberExist) {
          response_404(res, 'Member not found');
        }

        const todotasks = await prisma.task.findMany({
            where: {
                assigneeId: memberExist.id
            }
        });

        if(todotasks){
            todotasks.map(async (task) => {
                await prisma.task.update({
                    where: {
                        id: task.id
                    },
                    data: {
                        assigneeId: null
                    }
                })
            })
        }

        const assignedtasks =  prisma.task.findMany({
            where: {
                assignerId: memberExist.id
            }
        });

        const assigners = await prisma.member.findMany({
            where: {
                UserRole: userRole.ASSIGNER,
                id: {
                    not: memberExist.id
                }
            },
        });

        console.log(assigners);

        if(assigners.length <= 1){
            return response_400(res, "Only one assigner left in the organization");
        }
        if(assignedtasks){
            assignedtasks.map(async (task) => {
                await prisma.task.update({
                    where: {
                        id: task.id
                    },
                    data: {
                        assignerId: assigners[randomInt(0, assigners.length - 1)].id
                    }
                })
            })
        }

        const member = prisma.member.delete({
                where: {
                    id : memberExist.id,
                }
            }
        );

        await prisma.$transaction([todotasks, assignedtasks, member]);

        return response_200(res, "Member removed from organization", {member, assigners, assignedtasks, todotasks});
    } catch (error) {
        response_500(res, 'Error deleting member from organization:', error);
    }
}

export async function getmembers(req, res){
    try{
        const { organisationId } = req.body;

        const members = await prisma.member.findMany({
            where: {
                OrganizationId: organisationId
            },
            include: {
                User: true
            }
        });

        if(!members){
            return response_400(res, "Members not found");
        }

        return response_200(res, "Members fetched successfully", members);
    }
    catch(error) {
        response_500(res, 'Error getting members:', error);
    }
}


export async function getOrganisations(req,res){
  try{
    const organisations = await prisma.organization.findMany();
        response_200(res, "organisations fetched successfully",organisations);
  }
  catch(error)
  {
    response_500(res, 'Error getting UserId:', error);
  }
}
